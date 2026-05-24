from django.urls import path
from . import views

urlpatterns = [
    path('', views.lobby, name='lobby'),
    path('register/', views.register, name='register'),
    path('room/<str:room_name>/', views.room, name='room'),
]
