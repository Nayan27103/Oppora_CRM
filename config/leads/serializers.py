from rest_framework import serializers
from .models import Lead


class LeadSerializer(serializers.ModelSerializer):

    contact_name = serializers.CharField(
        source="contact.first_name",
        read_only=True
    )

    class Meta:
        model = Lead
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at"
        ]