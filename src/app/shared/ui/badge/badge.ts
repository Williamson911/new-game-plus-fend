import { Component, input } from '@angular/core';

export type BadgeVariant = 'featured' | 'sold';

@Component({
  selector: 'app-badge',
  imports: [],
  templateUrl: './badge.html',
  styleUrl: './badge.css',
})
export class Badge {
  readonly variant = input.required<BadgeVariant>();
  readonly label = input.required<string>();
}
