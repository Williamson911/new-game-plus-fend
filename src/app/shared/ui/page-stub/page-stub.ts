import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-stub',
  imports: [],
  templateUrl: './page-stub.html',
  styleUrl: './page-stub.css',
})
export class PageStub {
  readonly title = input.required<string>();
}
