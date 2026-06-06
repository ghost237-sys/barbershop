from django.contrib import admin
from .models import Barber, QueueEntry


@admin.register(Barber)
class BarberAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'waiting_count']
    list_filter = ['status']


@admin.register(QueueEntry)
class QueueEntryAdmin(admin.ModelAdmin):
    list_display = [
        'customer_name', 'customer_phone', 'barber',
        'preference', 'status', 'checked_in_at'
    ]
    list_filter = ['status', 'barber', 'preference']
    ordering = ['-checked_in_at']
