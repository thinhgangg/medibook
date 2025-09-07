import doctors.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("doctors", "0008_remove_doctor_hospital_doctor_is_active_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="doctor",
            name="dob",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="doctor",
            name="bio",
            field=models.TextField(
                blank=True, default="Bác sĩ chưa cập nhật tiểu sử", null=True
            ),
        ),
        migrations.AlterField(
            model_name="doctor",
            name="profile_picture",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="doctors/",
                validators=[doctors.validators.validate_avatar],
            ),
        ),
    ]
