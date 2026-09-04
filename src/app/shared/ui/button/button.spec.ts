import { TestBed } from '@angular/core/testing';
import { Button } from './button';

describe('Button', () => {
  it('renders a button element', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('button')).toBeTruthy();
  });

  it('defaults to variant "primary" and type "button"', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.type).toBe('button');
    expect(button.classList.contains('app-button--secondary')).toBe(false);
  });

  it('applies the secondary variant class when requested', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.componentRef.setInput('variant', 'secondary');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.classList.contains('app-button--secondary')).toBe(true);
  });

  it('emits "pressed" on click when not disabled', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.pressed.subscribe(() => (emitted = true));

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(emitted).toBe(true);
  });

  it('does not emit "pressed" when disabled', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.pressed.subscribe(() => (emitted = true));

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(emitted).toBe(false);
  });
});
