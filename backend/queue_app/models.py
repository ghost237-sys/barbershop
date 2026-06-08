from django.db import models
from django.utils import timezone
import uuid


class Barber(models.Model):
    """
    Represents one of the 3 barbers in the shop.
    Created once by the admin — barbers don't register themselves.
    """

    STATUS_CHOICES = [
        ('available', 'Available'),      # Idle, ready for next customer
        ('busy', 'Busy'),                # Currently cutting hair
        ('off_duty', 'Off Duty'),        # Stepped out / break / done for day
    ]

    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)  # optional, for future use
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='available'
    )

    # We track when a barber went off duty so we can
    # auto-reassign their waiting customers
    went_off_duty_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.status})"

    @property
    def current_customer(self):
        """Returns the QueueEntry currently being served by this barber."""
        return self.queue_entries.filter(status='in_service').first()

    @property
    def waiting_count(self):
        """How many customers are waiting specifically for this barber."""
        return self.queue_entries.filter(status='waiting').count()

    @property
    def estimated_wait_minutes(self):
        """
        Calculates how long a NEW customer joining this barber's queue
        would wait. Based on average haircut duration from recent history.
        """
        avg = self.get_average_service_minutes()

        # Count positions ahead: 1 if barber is busy (current customer)
        # + everyone waiting
        positions_ahead = self.waiting_count
        if self.current_customer:
            # Estimate remaining time for current customer
            # (assume they're halfway through on average)
            positions_ahead += 0.5

        return round(positions_ahead * avg)

    def get_average_service_minutes(self):
        """
        Looks at the last 10 completed haircuts for this barber
        and returns the average duration in minutes.
        Falls back to 20 minutes if no history yet.
        """
        DEFAULT_MINUTES = 20

        completed = self.queue_entries.filter(
            status='completed',
            service_started_at__isnull=False,
            service_ended_at__isnull=False,
        ).order_by('-service_ended_at')[:10]  # last 10 only

        if not completed.exists():
            return DEFAULT_MINUTES

        durations = []
        for entry in completed:
            delta = entry.service_ended_at - entry.service_started_at
            minutes = delta.total_seconds() / 60
            # Sanity check: ignore anything under 2 min or over 90 min
            # (data corruption / forgotten to close session)
            if 2 <= minutes <= 90:
                durations.append(minutes)

        if not durations:
            return DEFAULT_MINUTES

        return sum(durations) / len(durations)


class QueueEntry(models.Model):
    """
    The heart of the system.
    One row is created every time a customer checks in.
    It tracks the full lifecycle of their visit.
    """

    STATUS_CHOICES = [
        ('waiting', 'Waiting'),          # In the queue, not yet being served
        ('in_service', 'In Service'),    # Barber has called them, cutting now
        ('completed', 'Completed'),      # Haircut done, they've left
        ('no_show', 'No Show'),          # Called but didn't show up
        ('cancelled', 'Cancelled'),      # Customer left the queue voluntarily
    ]

    PREFERENCE_CHOICES = [
        ('next_available', 'Next Available / Anayepatikana'),
        ('specific_barber', 'Specific Barber / Mhusika'),
    ]

    # Unique token for this queue visit — used in QR code and SMS links
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    # Customer info — captured at check-in, no account needed
    customer_name = models.CharField(max_length=100)
    customer_phone = models.CharField(max_length=20)

    # Which barber they're assigned to
    # null initially if preference is 'next_available' — assigned when a barber frees up
    barber = models.ForeignKey(
        Barber,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='queue_entries'
    )

    # Did they ask for a specific barber or next available?
    preference = models.CharField(
        max_length=20,
        choices=PREFERENCE_CHOICES,
        default='next_available'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='waiting'
    )

    # --- Timestamps for tracking the full journey ---

    # When they checked in (joined the queue)
    checked_in_at = models.DateTimeField(default=timezone.now)

    # When the barber pressed "Next Customer" and called them over
    called_at = models.DateTimeField(null=True, blank=True)

    # When the barber actually started cutting (customer sat down)
    service_started_at = models.DateTimeField(null=True, blank=True)

    # When the barber marked them as done
    service_ended_at = models.DateTimeField(null=True, blank=True)

    # --- SMS tracking ---
    sms_sent_second_in_line = models.BooleanField(default=False)
    sms_sent_your_turn = models.BooleanField(default=False)

    # Position in queue — recalculated dynamically but stored for fast reads
    position = models.PositiveIntegerField(default=0)

    # How many times this entry has been skipped due to no-show
    no_show_count = models.PositiveIntegerField(default=0)

    requeued_as = models.OneToOneField(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requeued_from',
        )

    class Meta:
        ordering = ['checked_in_at']  # FIFO by default

    def __str__(self):
        return f"{self.customer_name} → {self.barber} [{self.status}]"

    @property
    def estimated_wait_minutes(self):
        """
        How long does THIS specific customer still have to wait?
        Counts only the entries ahead of them in their barber's queue.
        """
        if not self.barber:
            # Not yet assigned — return shop-wide shortest wait
            return None

        # Entries ahead of this one for the same barber, still waiting
        ahead = QueueEntry.objects.filter(
            barber=self.barber,
            status='waiting',
            checked_in_at__lt=self.checked_in_at
        ).count()

        # Add 0.5 if barber is currently busy (current cut in progress)
        if self.barber.current_customer:
            ahead += 0.5

        avg = self.barber.get_average_service_minutes()
        return round(ahead * avg)

    @property
    def queue_position(self):
        """
        1-based position in this customer's barber queue.
        Position 1 = next to be called.
        """
        if not self.barber or self.status != 'waiting':
            return None

        ahead = QueueEntry.objects.filter(
            barber=self.barber,
            status='waiting',
            checked_in_at__lt=self.checked_in_at
        ).count()

        return ahead + 1  # 1-based

class PushSubscription(models.Model):
    """
    Stores the browser push subscription for a queue entry.
    Created when the customer grants notification permission.
    Deleted when the queue entry is completed or cancelled.
    """
    queue_entry = models.OneToOneField(
        QueueEntry,
        on_delete=models.CASCADE,
        related_name='push_subscription'
    )
    endpoint    = models.TextField()
    p256dh      = models.TextField()  # encryption key
    auth        = models.TextField()  # auth secret
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Push sub for {self.queue_entry.customer_name}"