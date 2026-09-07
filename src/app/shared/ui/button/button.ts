import { Component, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input<boolean>(false);
  readonly bordered = input<boolean>(true);
  readonly pressed = output<void>();

  onClick(): void {
    if (!this.disabled()) {
      this.pressed.emit();
    }
  }
}
