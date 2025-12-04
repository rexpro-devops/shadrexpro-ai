import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { User } from '../types';
import * as authService from '../services/authService';
import { User as UserIcon, Users, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LoginModalProps {
  isOpen: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen }) => {
  const { login, signUp, continueAsGuest } = useAppStore();
  const [localUsers, setLocalUsers] = useState<User[]>([]);
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [newUserName, setNewUserName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalUsers(authService.getAllLocalUsers());
      setView('login');
      setNewUserName('');
    }
  }, [isOpen]);

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      signUp(newUserName.trim());
    }
  };

  const handleLogin = (user: User) => {
    login(user);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
              <UserIcon className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle>
            {view === 'login' ? 'Welcome Back' : 'Create Profile'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {view === 'login' && (
            <>
              <DialogDescription>
                {localUsers.length > 0
                  ? 'Select a profile to continue.'
                  : 'No profiles found. Create one to get started.'}
              </DialogDescription>

              {localUsers.length > 0 && (
                <ScrollArea className="h-[160px] border rounded-md">
                  <div className="space-y-2 p-4">
                    {localUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleLogin(user)}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                      >
                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">{user.name}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <Button
                onClick={() => setView('signup')}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Create New Profile
              </Button>
            </>
          )}

          {view === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <DialogDescription>
                Enter a name for your new local profile.
              </DialogDescription>
              <Input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Your Name"
                autoFocus
              />
              <Button
                type="submit"
                disabled={!newUserName.trim()}
                className="w-full"
              >
                Create & Continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setView('login')}
                className="w-full"
              >
                Back to profiles
              </Button>
            </form>
          )}

          <div className="border-t pt-4 space-y-3">
            <Button
              onClick={continueAsGuest}
              variant="outline"
              className="w-full"
            >
              Continue as Guest
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              As a guest, your chat history will not be saved between sessions.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
