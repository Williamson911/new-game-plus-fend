import { TestBed } from '@angular/core/testing';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders the label', () => {
    const fixture = TestBed.createComponent(Badge);
    fixture.componentRef.setInput('variant', 'featured');
    fixture.componentRef.setInput('label', 'Pépite');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Pépite');
  });

  it('applies the sold modifier class for variant "sold"', () => {
    const fixture = TestBed.createComponent(Badge);
    fixture.componentRef.setInput('variant', 'sold');
    fixture.componentRef.setInput('label', 'Vendu');
    fixture.detectChanges();

    const span = (fixture.nativeElement as HTMLElement).querySelector('.app-badge');
    expect(span?.classList.contains('app-badge--sold')).toBe(true);
  });

  it('does not apply the sold modifier class for variant "featured"', () => {
    const fixture = TestBed.createComponent(Badge);
    fixture.componentRef.setInput('variant', 'featured');
    fixture.componentRef.setInput('label', 'Pépite');
    fixture.detectChanges();

    const span = (fixture.nativeElement as HTMLElement).querySelector('.app-badge');
    expect(span?.classList.contains('app-badge--sold')).toBe(false);
  });
});
