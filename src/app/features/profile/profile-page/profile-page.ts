import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { WalletService } from '../../../core/shop/wallet.service';
import { WalletResponse } from '../../../core/shop/wallet.types';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, TextField, Button, CurrencyPipe, DatePipe],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly walletService = inject(WalletService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', Validators.required],
  });

  readonly loading = signal(true);

  readonly updating = signal(false);
  readonly updateSuccess = signal(false);
  readonly updateError = signal<string | null>(null);

  readonly deletingAccount = signal(false);
  readonly deleteError = signal<string | null>(null);

  readonly isSeller = signal(false);
  readonly wallet = signal<WalletResponse | null>(null);
  readonly walletLoading = signal(false);
  readonly payingOut = signal(false);
  readonly payoutError = signal<string | null>(null);

  constructor() {
    this.authService.refreshMe().subscribe((me) => {
      this.form.setValue({ username: me.username, email: me.email });
      this.loading.set(false);

      if (this.authService.hasRole('SELLER')) {
        this.isSeller.set(true);
        this.loadWallet();
      }
    });
  }

  private loadWallet(): void {
    this.walletLoading.set(true);
    this.walletService.getWallet().subscribe({
      next: (wallet) => {
        this.wallet.set(wallet);
        this.walletLoading.set(false);
      },
      error: () => {
        this.walletLoading.set(false);
      },
    });
  }

  requestPayout(): void {
    if (this.payingOut()) {
      return;
    }

    this.payingOut.set(true);
    this.payoutError.set(null);

    this.walletService.requestPayout().subscribe({
      next: (wallet) => {
        this.wallet.set(wallet);
        this.payingOut.set(false);
      },
      error: () => {
        this.payingOut.set(false);
        this.payoutError.set('Impossible de retirer le solde pour le moment.');
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.updating()) {
      return;
    }

    this.updating.set(true);
    this.updateSuccess.set(false);
    this.updateError.set(null);

    this.authService.updateProfile(this.form.getRawValue()).subscribe({
      next: () => {
        this.updating.set(false);
        this.updateSuccess.set(true);
      },
      error: () => {
        this.updating.set(false);
        this.updateError.set("Nom d'utilisateur ou email déjà utilisé.");
      },
    });
  }

  deleteAccount(): void {
    if (!window.confirm('Supprimer définitivement ton compte ?')) {
      return;
    }

    this.deletingAccount.set(true);
    this.deleteError.set(null);

    this.authService.deleteAccount().subscribe({
      next: () => {
        this.deletingAccount.set(false);
        this.authService.logout();
        this.router.navigate(['/']);
      },
      error: () => {
        this.deletingAccount.set(false);
        this.deleteError.set(
          'Impossible de supprimer ton compte : solde d\'abord ta boutique, tes commandes et tes avis en cours.',
        );
      },
    });
  }
}
