from django.urls import path
from . import views

urlpatterns = [
    path('checkin/', views.CheckInView.as_view(), name='checkin'),
    path('queue/', views.QueueStatusView.as_view(), name='queue-status'),
    path('queue/entry/<uuid:token>/', views.QueueEntryDetailView.as_view(), name='entry-detail'),
    path('barbers/', views.BarberListView.as_view(), name='barber-list'),
    path('barber/<int:barber_id>/next/', views.NextCustomerView.as_view(), name='next-customer'),
    path('barber/<int:barber_id>/noshow/', views.NoShowView.as_view(), name='no-show'),
    path('barber/<int:barber_id>/offduty/', views.OffDutyView.as_view(), name='off-duty'),
    path('barber/<int:barber_id>/onduty/', views.OnDutyView.as_view(), name='on-duty'),
]
