from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('queue_app', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='queueentry',
            name='requeued_as',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='requeued_from',
                to='queue_app.queueentry',
            ),
        ),
    ]
