import { Component, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Badge } from '../badge/badge';

@Component({
  selector: 'app-card',
  imports: [CurrencyPipe, RouterLink, Badge],
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class Card {
  readonly title = input.required<string>();
  readonly price = input.required<number>();
  readonly imageUrl = input<string | null>(null);
  readonly platform = input<string | null>(null);
  readonly routerLink = input.required<string | unknown[]>();
  readonly featured = input<boolean>(false);
  readonly sold = input<boolean>(false);
}
