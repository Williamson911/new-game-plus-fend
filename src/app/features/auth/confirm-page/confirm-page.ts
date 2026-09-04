import { Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

type ConfirmStatus = 'pending' | 'success' | 'error';

@Component({
  selector: 'app-confirm-page',
  imports: [RouterLink],
  templateUrl: './confirm-page.html',
  styleUrl: './confirm-page.css',
})
export class ConfirmPage implements OnInit {
  private readonly authService = inject(AuthService);

  readonly token = input<string | null>(null);
  readonly status = signal<ConfirmStatus>('pending');

  ngOnInit(): void {
    const token = this.token();
    if (!token) {
      this.status.set('error');
      return;
    }

    this.authService.confirmEmail(token).subscribe({
      next: () => this.status.set('success'),
      error: () => this.status.set('error'),
    });
  }
}
