import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { HotelDetailService } from 'libs/admin/shared/src/lib/services/hotel-detail.service';
import { ModuleNames } from '../../../../../../../../../../libs/admin/shared/src/index';
import { SnackBarService } from '../../../../../../../../../../libs/shared/material/src/index';
import { SubscriptionPlanService } from '../../services/subscription-plan.service';
import { TokenUpdateService } from '../../services/token-update.service';

@Component({
  selector: 'admin-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss'],
})
export class FilterComponent implements OnChanges, OnInit {
  @Input() initialFilterValue;
  @Output() onCloseFilter = new EventEmitter();
  @Output() onApplyFilter = new EventEmitter();
  @Output() onResetFilter = new EventEmitter();

  hotelList = [];
  branchList = [];
  feedbackType;
  outlets = [];
  hotelBasedToken = { key: null, value: null };

  filterForm: FormGroup;
  isTokenLoading = false;

  constructor(
    private _fb: FormBuilder,
    private _hotelDetailService: HotelDetailService,
    private tokenUpdateService: TokenUpdateService,
    private snackbarService: SnackBarService,
    protected subscriptionService: SubscriptionPlanService
  ) {
    this.initFilterForm();
  }

  closePopup() {
    this.onCloseFilter.emit();
  }

  initFilterForm() {
    this.filterForm = this._fb.group({
      property: this._fb.group({
        hotelName: ['', [Validators.required]],
        branchName: ['', [Validators.required]],
      }),
      guest: this._fb.group({
        guestCategory: this._fb.group({
          isRepeatedGuest: [''],
          isNewGuest: [''],
        }),
        guestType: this._fb.group({
          isVip: [''],
          isMembership: [''],
          isGeneral: [''],
        }),
      }),
      feedback: this._fb.group({
        feedbackType: [
          this.checkForTransactionFeedbackSubscribed()
            ? 'TRANSACTIONALFEEDBACK'
            : 'STAYFEEDBACK',
        ],
      }),
      outlets: this._fb.group({}),
    });
  }

  ngOnChanges() {
    this.setInitialFilterValue();
  }

  setInitialFilterValue() {
    this.filterForm.patchValue(this.initialFilterValue);
  }

  get isDisabled() {
    return this.filterForm.get('property').invalid;
  }

  ngOnInit(): void {
    this.initLOV();
    this.registerListeners();
    this.setInitialFilterValue();
  }

  registerListeners() {
    this.listenForBrandChanges();
    this.listenForBranchChanges();
  }

  listenForBrandChanges() {
    this.filterForm
      .get('property')
      .get('hotelName')
      .valueChanges.subscribe((brandId) => {
        const { entities } = this._hotelDetailService.brands.find(
          (brand) => brand['id'] === brandId
        );

        this.branchList = entities.map((item) => ({
          label: item.name,
          value: item.id,
        }));

        const currentBranch = this.filterForm.get('property').get('branchName')
          .value;

        if (
          currentBranch &&
          this.branchList.findIndex((item) => item.value === currentBranch) ===
            -1
        ) {
          this.filterForm.get('property').patchValue({ branchName: '' }); //resetting hotel
        }
      });
  }

  listenForBranchChanges() {
    this.filterForm
      .get('property')
      .get('branchName')
      .valueChanges.subscribe((id) => {
        const brandName = this.filterForm.get('property').get('hotelName')
          .value;
        const outlets =
          this._hotelDetailService.brands
            .find((item) => item.id === brandName)
            ?.entities.find((item) => item.id).entities ?? [];

        this.outlets = outlets;
        this.updateOutletsFormControls(outlets);
      });
  }

  updateOutletsFormControls(outlets) {
    let outletFG: FormGroup = this.filterForm.get('outlets') as FormGroup;
    if (Object.keys(outletFG.controls).length) outletFG = this._fb.group({});

    outlets.forEach((outlet) => {
      outletFG.addControl(
        outlet.id,
        new FormControl(
          this.feedbackFG.get('feedbackType').value === 'TRANSACTIONALFEEDBACK'
        )
      );
    });
  }

  updateOutletsValue(value: boolean) {
    Object.keys(this.outletFG.controls).forEach((id) => {
      this.outletFG.get(id).setValue(value);
    });
  }

  initLOV() {
    this.setBrandLOV();
  }

  setBrandLOV() {
    this.hotelList = this._hotelDetailService.brands.map((item) => ({
      label: item.name,
      value: item.id,
    }));
  }

  applyFilter() {
    if (
      this.feedbackFG.get('feedbackType').value !== 'STAYFEEDBACK' &&
      !Object.keys(this.outletFG.value)
        .map((key) => this.outletFG.value[key])
        .reduce((acc, red) => acc || red)
    ) {
      this.snackbarService.openSnackBarAsText(
        'Please select at-least one outlet.'
      );
      return;
    }
    this.onApplyFilter.next({
      values: this.filterForm.getRawValue(),
      token: this.hotelBasedToken,
    });
  }

  handleHotelChange(event) {
    this.isTokenLoading = true;

    this.tokenUpdateService.getUpdatedToken(event).subscribe(
      (response) => {
        const key = Object.keys(response)[0];
        this.hotelBasedToken = { key, value: response[key] };
      },
      ({ error }) => {
        this.snackbarService.openSnackBarAsText(error.message);
      },
      () => {
        this.isTokenLoading = false;
      }
    );
  }

  resetFilter() {
    const propertyValue = this.filterForm.get('property').value;
    const feedback = this.filterForm.get('feedback').value;
    const outlets = this.filterForm.get('outlets').value;
    Object.keys(outlets).forEach((key) => (outlets[key] = true));
    this.filterForm.reset({ property: propertyValue, feedback, outlets });
    this.onResetFilter.next(this.filterForm.getRawValue());
    this.hotelBasedToken = { key: null, value: null };
  }

  onOutletSelect(event) {
    if (
      event.checked &&
      this.feedbackFG.get('feedbackType').value !== 'TRANSACTIONALFEEDBACK'
    ) {
      this.feedbackFG.patchValue({ feedbackType: 'TRANSACTIONALFEEDBACK' });
    } else if (
      !this.checkForNoOutletSelected(this.outletFG.value) &&
      this.checkForStayFeedbackSubscribed()
    ) {
      this.feedbackFG.patchValue({ feedbackType: 'STAYFEEDBACK' });
    }
  }

  checkForNoOutletSelected(outlets) {
    let returnValue = false;
    Object.keys(outlets).forEach((outlet) => {
      if (outlets[outlet]) returnValue = true;
    });
    return returnValue;
  }

  handleFeedbackTypeChange(event) {
    switch (event.value) {
      case 'TRANSACTIONALFEEDBACK':
        this.updateOutletsValue(true);
        break;
      case 'STAYFEEDBACK':
        this.updateOutletsValue(false);
        break;
      case 'ALL':
        this.updateOutletsValue(true);
        break;
    }
  }

  checkForTransactionFeedbackSubscribed() {
    return this.subscriptionService.checkModuleSubscription(
      ModuleNames.FEEDBACK_TRANSACTIONAL
    );
  }

  checkForStayFeedbackSubscribed() {
    return this.subscriptionService.checkModuleSubscription(
      ModuleNames.FEEDBACK
    );
  }

  get propertyFG() {
    return this.filterForm.get('property') as FormGroup;
  }

  get outletFG() {
    return this.filterForm.get('outlets') as FormGroup;
  }

  get feedbackFG() {
    return this.filterForm.get('feedback') as FormGroup;
  }

  get guestFG() {
    return this.filterForm.get('guest') as FormGroup;
  }

  get hotelNameFC() {
    return this.propertyFG.get('hotelName') as FormControl;
  }

  get branchNameFC() {
    return this.propertyFG.get('branchName') as FormControl;
  }
}
