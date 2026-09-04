import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectField } from './select-field';

@Component({
  imports: [ReactiveFormsModule, SelectField],
  template: `<app-select-field label="Genre" [options]="options" [formControl]="control" />`,
})
class HostComponent {
  options = [
    { value: 'rpg', label: 'RPG' },
    { value: 'action', label: 'Action' },
  ];
  control = new FormControl('', { nonNullable: true });
}

describe('SelectField', () => {
  it('renders one option per entry plus the label', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Genre');
    expect(el.querySelectorAll('option').length).toBe(2);
  });

  it('reflects the form control value into the select', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.control.setValue('action');
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('select') as HTMLSelectElement).value).toBe('action');
  });

  it('propagates change events back to the form control', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'rpg';
    select.dispatchEvent(new Event('change'));

    expect(fixture.componentInstance.control.value).toBe('rpg');
  });
});
