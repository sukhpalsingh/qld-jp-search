import { Component } from '@angular/core';
import { SearchService } from '../services/search.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

    constructor(private searchService: SearchService) {
        this.searchService.createSchema();
    }
}
