from django.contrib import admin
from .models import Organization, TeamMember

admin.site.register(Organization)
admin.site.register(TeamMember)