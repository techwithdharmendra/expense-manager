import { FilterState } from '../components/FilterSection';

class FilterStore {
  private state: FilterState = {
    type: 'all',
    accountId: [],
    categoryId: [],
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
