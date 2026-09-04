import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, TextField, Button],
  templateUrl: './reset-password-page.html',
  styleUrl: './reset-password-page.css',
})
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly token = input<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly passwordMismatch = signal(false);
  readonly missingToken = signal(false);

  submit(): void {
    const token = this.token();
    if (!token) {
      this.missingToken.set(true);
      return;
    }
    this.missingToken.set(false);

    if (this.form.invalid || this.submitting()) {
      return;
    }

    const { newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.passwordMismatch.set(true);
      return;
    }
    this.passwordMismatch.set(false);

    this.submitting.set(true);
    this.serverError.set(null);

    this.authService.resetPassword({ token, newPassword }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.submitting.set(false);
        this.serverError.set('Lien de réinitialisation invalide ou expiré.');
      },
    });
  }
}
