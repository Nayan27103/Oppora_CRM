from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView
)
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [

    path("admin/",admin.site.urls),

    # JWT authentication urls
    path("api/token/refresh/",TokenRefreshView.as_view()),

    #authentication urls
    path("api/accounts/",include("accounts.urls")),

    #organization urls
    path("api/organizations/",include("organizations.urls")),

    #contact urls
    path("api/contacts/",include("contacts.urls")),

    #leads urls
    path("api/leads/",include("leads.urls")),

    #activities urls
    path("api/activities/",include("activities.urls")),

    #dashboard urls
    path("api/dashboard/",include("dashboard.urls")),

    #ai_assistant urls
    path("api/ai/",include("ai_assistant.urls")),

    #notifications urls
    path("api/notifications/",include("notifications.urls")),

    #deals urls
    path("api/deals/",include("deals.urls")),

    #attachment urls
    path("api/attachments/",include("attachments.urls")),

    #finder urls
    path("api/finder/",include("finder.urls")),

    # workflows urls
    path("api/workflows/",include("workflows.urls")),

    # API documentation urls
    path("api/redoc/",SpectacularRedocView.as_view(url_name="schema"),name="redoc"),
    path("api/schema/",SpectacularAPIView.as_view(),name="schema"),
    path("api/docs/",SpectacularSwaggerView.as_view(url_name="schema"),name="swagger-ui"),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )