import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-checkout-success-page',
  imports: [RouterLink, Button],
  templateUrl: './checkout-success-page.html',
  styleUrl: './checkout-success-page.css',
})
export class CheckoutSuccessPage {}
