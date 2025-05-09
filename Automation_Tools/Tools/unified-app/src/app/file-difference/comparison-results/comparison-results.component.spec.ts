import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComparisonResultsComponent } from './comparison-results.component';

describe('ComparisonResultsComponent', () => {
  let component: ComparisonResultsComponent;
  let fixture: ComponentFixture<ComparisonResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComparisonResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComparisonResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
