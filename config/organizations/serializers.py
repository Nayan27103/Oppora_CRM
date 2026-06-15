from rest_framework import serializers
from .models import *


class OrganizationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "owner",
            "created_at"
        ]
        read_only_fields = [
            "id",
            "owner",
            "created_at"
        ]

class TeamMemberSerializer(
    serializers.ModelSerializer
):

    user_email = serializers.ReadOnlyField(
        source="user.email"
    )

    class Meta:
        model = TeamMember
        fields = [
            "id",
            "user",
            "user_email",
            "role"
        ]

from django.contrib.auth import get_user_model
from .models import TeamMember

User = get_user_model()


class TeamMemberCreateSerializer(serializers.Serializer):

    organization_id = serializers.IntegerField()
    user_email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=[
            "ADMIN",
            "MANAGER",
            "MEMBER"
        ]
    )

    def validate(self, attrs):

        try:
            user = User.objects.get(
                email=attrs["user_email"]
            )
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {
                    "user_email":
                    "User not found"
                }
            )

        attrs["user"] = user

        return attrs


class TeamMemberSerializer(
    serializers.ModelSerializer
):

    user_email = serializers.CharField(
        source="user.email",
        read_only=True
    )

    class Meta:
        model = TeamMember
        fields = [
            "id",
            "user",
            "user_email",
            "role",
            "created_at"
        ]