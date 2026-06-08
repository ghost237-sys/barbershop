from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('queue_app', '0003_pushsubscription'),
    ]

    operations = [
        migrations.RemoveField(model_name='pushsubscription', name='endpoint'),
        migrations.RemoveField(model_name='pushsubscription', name='p256dh'),
        migrations.RemoveField(model_name='pushsubscription', name='auth'),
        migrations.AddField(
            model_name='pushsubscription',
            name='fcm_token',
            field=models.TextField(default=''),
            preserve_default=False,
        ),
    ]