
import { User } from '../types';

const USERS_KEY = 'mrsmart_users';
const SESSION_KEY = 'mrsmart_session';

class AuthService {
  // Simulate a database delay
  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getUsers(): User[] {
    const usersStr = localStorage.getItem(USERS_KEY);
    return usersStr ? JSON.parse(usersStr) : [];
  }

  getCurrentUser(): User | null {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    return sessionStr ? JSON.parse(sessionStr) : null;
  }

  async login(email: string, password: string): Promise<User> {
    await this.delay(800); // Fake network delay

    // For demo purposes, we will treat the password "admin123" as the 'correct' password for any user 
    // to simulate authentication logic without storing hashed passwords in localstorage (security risk).
    // In a real app, you would hash this and compare against a DB.
    
    // Check if user exists
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        throw new Error("Account not found. Please sign up.");
    }

    // Simple password check for prototype
    if (password !== 'admin123' && password !== 'password') {
        throw new Error("Invalid credentials.");
    }

    // Set Session
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }

  async register(name: string, email: string, password: string): Promise<User> {
    await this.delay(800);

    const users = this.getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("User already exists.");
    }

    const newUser: User = {
        id: Date.now().toString(),
        name,
        email,
        avatar: ''
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Auto login
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    return newUser;
  }

  async googleLogin(googleUser: any): Promise<User> {
    // This receives the Google User object from the OAuth flow
    await this.delay(500);

    const users = this.getUsers();
    let user = users.find(u => u.email.toLowerCase() === googleUser.email.toLowerCase());

    if (!user) {
        // Create new user from Google Data
        user = {
            id: Date.now().toString(),
            name: googleUser.name,
            email: googleUser.email,
            avatar: googleUser.picture,
            googleToken: googleUser.accessToken
        };
        users.push(user);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } else {
        // Update existing user with latest Google info
        user.avatar = googleUser.picture;
        user.googleToken = googleUser.accessToken;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    
    // Sync with Integration Settings so the rest of the app knows we are connected
    localStorage.setItem('nexus_google_user', JSON.stringify({
        name: user.name,
        email: user.email,
        picture: user.avatar
    }));
    if (user.googleToken) {
        localStorage.setItem('nexus_google_token', user.googleToken);
    }

    return user;
  }

  logout() {
    localStorage.removeItem(SESSION_KEY);
    // Optional: Clear integration tokens? 
    // keeping them might be convenient, but for security strictness:
    localStorage.removeItem('nexus_google_user');
    localStorage.removeItem('nexus_google_token');
    window.location.reload();
  }
}

export const authService = new AuthService();

