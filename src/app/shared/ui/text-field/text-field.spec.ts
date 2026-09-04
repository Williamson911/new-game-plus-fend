import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TextField } from './text-field';

@Component({
  imports: [ReactiveFormsModule, TextField],
  template: `<app-text-field label="Email" type="email" [formControl]="control" [error]="error" />`,
})
class HostComponent {
  control = new FormControl('', { nonNullable: true });
  error: string | null = null;
}

describe('TextField', () => {
  it('renders the label and reflects the form control value into the input', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.control.setValue('will@test.dev');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Email');
    expect((el.querySelector('input') as HTMLInputElement).value).toBe('will@test.dev');
  });

  it('propagates input events back to the form control', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'typed@test.dev';
    input.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.control.value).toBe('typed@test.dev');
  });

  it('shows an error message when the error input is set', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.error = 'Email invalide';
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Email invalide');
  });
});
