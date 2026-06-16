from rest_framework import serializers
from .models import SearchQuery


class SearchQueryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchQuery
        fields = ['domain', 'industry', 'job_title', 'location', 'search_type']

    def validate_domain(self, value):
        # Strip protocol if user pastes full URL
        value = value.replace('https://', '').replace('http://', '').strip('/')
        return value


class SearchQueryResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchQuery
        fields = [
            'id', 'domain', 'industry', 'job_title', 'location',
            'search_type', 'status', 'contacts_imported',
            'companies_imported', 'error_message', 'created_at'
        ]
        read_only_fields = fields