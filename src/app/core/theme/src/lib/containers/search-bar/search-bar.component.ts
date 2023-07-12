import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnDestroy,
  Output,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatDialogConfig } from '@angular/material/dialog';
import { DetailsComponent as BookingDetailComponent } from 'libs/admin/reservation/src/lib/components/details/details.component';
import { HotelDetailService } from 'libs/admin/shared/src/lib/services/hotel-detail.service';
import { ModalService } from 'libs/shared/material/src/lib/services/modal.service';
import { empty, Subscription, of } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import { SnackBarService } from '../../../../../../../../../../libs/shared/material/src/lib/services/snackbar.service';
import { SearchResultDetail } from '../../data-models/search-bar-config.model';
import { SearchService } from '../../services/search.service';
import { Router } from '@angular/router';
import { GlobalFilterService } from '../../services/global-filters.service';

@Component({
  selector: 'admin-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
})
export class SearchBarComponent implements OnInit, OnDestroy {
  @Input() parentForm: FormGroup;
  @Input() name: string;
  @Input() parentSearchVisible: boolean;
  @Output() parentFilterVisible = new EventEmitter();
  @ViewChild('searchResult') searchResult;
  @ViewChild('searchBar') searchBar: ElementRef;

  entityId: string;

  searchOptions: SearchResultDetail[];
  results: any;
  searchDropdownVisible = false;
  $subscription = new Subscription();

  constructor(
    private searchService: SearchService,
    private hotelDetailService: HotelDetailService,
    private modal: ModalService,
    private snackbarService: SnackBarService,
    private router: Router,
    private globalFilterService: GlobalFilterService
  ) {}

  searchValue = false;

  ngOnInit(): void {
    this.registerListeners();
  }

  registerListeners(): void {
    this.listenForSearchChanges();
  }

  /**
   * @function listenForGlobalFilters To listen for global filters and load data when filter value is changed.
   */
  listenForGlobalFilters(): void {
    this.$subscription.add(
      this.globalFilterService.globalFilter$.subscribe((data) => {
        const { branchName: branchId } = data['filter'].value.property;
        this.entityId = branchId;
      })
    );
  }

  listenForSearchChanges(): void {
    const formChanges$ = this.parentForm.valueChanges;
    const findSearch$ = ({ search }: { search: string }) =>
      this.searchService.search(search.trim(), this.hotelDetailService.entityId);
    formChanges$
      .pipe(
        debounceTime(1000),
        switchMap((formValue) => {
          if (formValue?.search?.length > 2) {
            return findSearch$(formValue).pipe(
              catchError((err) => {
                return empty();
              })
            );
          } else return of('minThreeChar');
        })
      )
      .subscribe(
        (response) => {
          if (response === 'minThreeChar') {
            return;
          }
          this.results = new SearchResultDetail().deserialize(response);

          this.searchOptions = [];
          this.searchDropdownVisible = true;

          this.searchValue = true;
          if (
            this.results.searchResults &&
            this.results.searchResults.length > 0
          ) {
            this.searchOptions = this.results.searchResults.slice(0, 5);
          } else if (response && response.reservations !== undefined) {
            this.searchDropdownVisible = false;
            this.searchValue = false;
          }
        },
        ({ error }) => {
          if (error) {
            this.snackbarService.openSnackBarAsText(error.message);
          }
        }
      );
  }

  getAllResults() {
    this.searchOptions = this.results.searchResults;
  }

  setOptionSelection(searchData) {
    this.searchDropdownVisible = false;
    this.searchResult.hide();
    this.openDetailsPage(searchData);
  }

  openDetailsPage(searchData) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    dialogConfig.width = '100%';
    const detailCompRef = this.modal.openDialog(
      BookingDetailComponent,
      dialogConfig
    );

    if (searchData.type === 'GUEST') {
      detailCompRef.componentInstance.guestId = searchData.id;
    } else {
      detailCompRef.componentInstance.guestId = searchData.guestId;
      detailCompRef.componentInstance.bookingNumber = searchData.bookingNumber;
    }

    this.$subscription.add(
      detailCompRef.componentInstance.onDetailsClose.subscribe((res) => {
        // TODO statements
        detailCompRef.close();
      })
    );
  }

  onFocus() {
    this.parentFilterVisible.emit();

    if (
      this.searchOptions &&
      this.searchOptions.length &&
      !this.searchDropdownVisible
    ) {
      this.searchDropdownVisible = true;
    }
  }

  openEditPackage(id: string) {
    this.searchDropdownVisible = false;
    this.searchResult.hide();

    this.router.navigateByUrl(`/pages/library/packages/edit/${id}`);
  }

  clearSearch() {
    this.searchOptions = [];
    this.parentForm.get('search').patchValue('');
    this.searchDropdownVisible = false;
    this.searchResult.hide();

    this.searchValue = false;
  }

  ngOnDestroy(): void {
    this.$subscription.unsubscribe();
  }
}
