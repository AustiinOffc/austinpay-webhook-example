"""
Tambahkan snippet ini ke urls.py app kamu (contoh: payments/urls.py),
lalu include app tsb di project urls.py utama seperti biasa.
"""

from django.urls import path
from . import views

urlpatterns = [
    path("webhook/austinpay", views.austinpay_webhook, name="austinpay_webhook"),
]
