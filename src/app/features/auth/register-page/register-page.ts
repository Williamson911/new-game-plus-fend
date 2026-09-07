import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, TextField, Button],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css',
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly passwordMismatch = signal(false);
  readonly registered = signal(false);

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const { username, email, password, confirmPassword } = this.form.getRawValue();

    if (password !== confirmPassword) {
      this.passwordMismatch.set(true);
      return;
    }
    this.passwordMismatch.set(false);

    this.submitting.set(true);
    this.serverError.set(null);

    this.authService.register({ username, email, password }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.registered.set(true);
        setTimeout(() => this.router.navigate(['/auth/login']), 3000);
      },
      error: () => {
        this.submitting.set(false);
        this.serverError.set("Impossible de créer le compte (nom d'utilisateur ou email déjà pris).");
      },
    });
  }
}
