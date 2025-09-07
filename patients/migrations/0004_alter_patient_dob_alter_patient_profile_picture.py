import doctors.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("patients", "0003_patient_profile_picture"),
    ]

    operations = [
        migrations.AlterField(
            model_name="patient",
            name="dob",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="patient",
            name="profile_picture",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="patients/",
                validators=[doctors.validators.validate_avatar],
            ),
        ),
    ]
