import { TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFrBe from '@angular/common/locales/fr-BE';
import { provideRouter } from '@angular/router';
import { Card } from './card';

registerLocaleData(localeFrBe);

describe('Card', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: LOCALE_ID, useValue: 'fr-BE' }],
    });
  });

  it('renders the title and formatted price', () => {
    const fixture = TestBed.createComponent(Card);
    fixture.componentRef.setInput('title', 'Kingdom Hearts');
    fixture.componentRef.setInput('price', 20);
    fixture.componentRef.setInput('routerLink', ['/listings', '123']);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Kingdom Hearts');
    expect(el.textContent).toContain('20,00');
  });

  it('shows a "featured" badge only when featured is true', () => {
    const fixture = TestBed.createComponent(Card);
    fixture.componentRef.setInput('title', 'Kingdom Hearts');
    fixture.componentRef.setInput('price', 20);
    fixture.componentRef.setInput('routerLink', ['/listings', '123']);
    fixture.componentRef.setInput('featured', true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('app-badge')).toBeTruthy();
  });

  it('does not show a badge when neither featured nor sold', () => {
    const fixture = TestBed.createComponent(Card);
    fixture.componentRef.setInput('title', 'Kingdom Hearts');
    fixture.componentRef.setInput('price', 20);
    fixture.componentRef.setInput('routerLink', ['/listings', '123']);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('app-badge')).toBeFalsy();
  });
});
