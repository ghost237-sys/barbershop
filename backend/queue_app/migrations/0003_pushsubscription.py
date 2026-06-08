from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('queue_app', '0002_queueentry_requeued_as'),
    ]

    operations = [
        migrations.CreateModel(
            name='PushSubscription',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('endpoint', models.TextField()),
                ('p256dh', models.TextField()),
                ('auth', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('queue_entry', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='push_subscription',
                    to='queue_app.queueentry',
                )),
            ],
        ),
    ]