from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.auth import login
from django.contrib import messages
from .forms import RegisterForm


def register(request):
    if request.user.is_authenticated:
        return redirect('lobby')
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, f'Account ban gaya! Welcome, {user.username}!')
            return redirect('lobby')
    else:
        form = RegisterForm()
    return render(request, 'registration/register.html', {'form': form})


@login_required
def lobby(request):
    """Room list / home page."""
    # Available rooms (hardcoded + user-created)
    rooms = ['general', 'tech', 'random', 'project']
    return render(request, 'chat/lobby.html', {'rooms': rooms})


@login_required
def room(request, room_name):
    """Chat room page."""
    return render(request, 'chat/room.html', {
        'room_name': room_name,
        'username': request.user.username,
    })
