from django.contrib import admin
from common.models import RequestLog

@admin.register(RequestLog)
class RequestLogAdmin(admin.ModelAdmin):
    list_display = ["id", "method", "path", "user", "execution_time", "created_at"]
    list_filter = ["method", "created_at"]
    search_fields = ["path", "user__username", "user__email"]
    readonly_fields = ["method", "path", "user", "execution_time", "created_at"]
