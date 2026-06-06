from rest_framework import serializers
from .models import Barber, QueueEntry


class BarberSerializer(serializers.ModelSerializer):
    """
    Barber summary — includes live computed fields.
    Used in the barber list and embedded in queue entries.
    """
    waiting_count = serializers.IntegerField(read_only=True)
    estimated_wait_minutes = serializers.IntegerField(read_only=True)
    current_customer = serializers.SerializerMethodField()

    class Meta:
        model = Barber
        fields = [
            'id', 'name', 'status',
            'waiting_count', 'estimated_wait_minutes',
            'current_customer',
        ]

    def get_current_customer(self, obj):
        entry = obj.current_customer
        if not entry:
            return None
        return {
            'name': entry.customer_name,
            'checked_in_at': entry.checked_in_at,
        }


class QueueEntrySerializer(serializers.ModelSerializer):
    """
    Full queue entry — used in queue status view and wait room.
    """
    barber_name = serializers.CharField(source='barber.name', read_only=True)
    queue_position = serializers.IntegerField(read_only=True)
    estimated_wait_minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = QueueEntry
        fields = [
            'id', 'token', 'customer_name', 'customer_phone',
            'barber', 'barber_name', 'preference',
            'status', 'queue_position', 'estimated_wait_minutes',
            'checked_in_at', 'called_at', 'service_started_at',
            'sms_sent_second_in_line', 'sms_sent_your_turn',
        ]


class CheckInSerializer(serializers.Serializer):
    """
    Validates the check-in form data from the customer.
    Not a ModelSerializer — we handle creation manually for control.
    """
    customer_name = serializers.CharField(max_length=100)
    customer_phone = serializers.CharField(max_length=20)
    preference = serializers.ChoiceField(
        choices=['next_available', 'specific_barber']
    )
    # Only required if preference is 'specific_barber'
    barber_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, data):
        if data['preference'] == 'specific_barber':
            if not data.get('barber_id'):
                raise serializers.ValidationError(
                    "barber_id is required when preference is 'specific_barber'."
                )
            # Check the barber exists and is not off duty
            try:
                barber = Barber.objects.get(id=data['barber_id'])
            except Barber.DoesNotExist:
                raise serializers.ValidationError("Barber not found.")
            if barber.status == 'off_duty':
                raise serializers.ValidationError(
                    f"{barber.name} is currently off duty. "
                    "Please choose another barber or select Next Available."
                )
            data['barber'] = barber
        return data

