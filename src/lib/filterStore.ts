import { FilterState } from '../components/FilterSection';

class FilterStore {
  private state: FilterState = {
    type: 'all',
    accountId: 'all',
    categoryId: 'all',
    dateRange: 'month',
    startDate: '',
    endDate: '',
    searchTerm: ''
  };

  getState() {
    return this.state;
  }

  setState(newState: FilterState) {
    this.state = newState;
  }
}

export const filterStore = new FilterStore();
