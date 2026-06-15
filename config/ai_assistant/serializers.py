from rest_framework import serializers


class EmailGeneratorSerializer(
    serializers.Serializer
):
    lead_id = serializers.IntegerField()
    goal = serializers.CharField()


class LeadSummarySerializer(
    serializers.Serializer
):
    lead_id = serializers.IntegerField()


class MeetingNotesSerializer(
    serializers.Serializer
):
    meeting_text = serializers.CharField()


class LeadScoreSerializer(
    serializers.Serializer
):
    lead_id = serializers.IntegerField()