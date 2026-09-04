import { TestBed } from '@angular/core/testing';
import { PageStub } from './page-stub';

describe('PageStub', () => {
  it('renders the given title', () => {
    const fixture = TestBed.createComponent(PageStub);
    fixture.componentRef.setInput('title', 'My Shop');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain('My Shop');
  });
});
