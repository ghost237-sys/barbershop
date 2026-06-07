from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from queue_app.models import QueueEntry


class Command(BaseCommand):
    help = 'Cancels queue entries that have been waiting for more than 3 hours'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(hours=3)

        stale = QueueEntry.objects.filter(
            status='waiting',
            checked_in_at__lt=cutoff
        )

        count = stale.count()

        stale.update(status='cancelled')

        self.stdout.write(
            self.style.SUCCESS(f'Cancelled {count} stale queue entries.')
        )
