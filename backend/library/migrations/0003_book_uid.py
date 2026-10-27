import uuid

from django.db import migrations, models


def give_ids(apps, schema_editor):
    for book in apps.get_model("library", "Book").objects.all():
        book.uid = uuid.uuid4()
        book.save(update_fields=["uid"])


class Migration(migrations.Migration):

    dependencies = [
        ('library', '0002_book_data'),
    ]

    # Books already there each get an id of their own before it must be unique.
    operations = [
        migrations.AddField(
            model_name='book',
            name='uid',
            field=models.UUIDField(editable=False, null=True),
        ),
        migrations.RunPython(give_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='book',
            name='uid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.RemoveField(
            model_name='book',
            name='slug',
        ),
    ]
