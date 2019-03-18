import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite/ngx'
import { Platform, LoadingController } from '@ionic/angular';

@Injectable({
    providedIn: 'root'
})
export class SearchService {

    url = 'https://data.qld.gov.au/api/action/datastore_search_sql';

    calls = 0;

    sql = [];

    loading: any;

    constructor(
        private http: HttpClient,
        private sqlite: SQLite,
        private platform: Platform,
        private loadingController: LoadingController
    ) { }

    escapeString(content) {
        return content.replace(/'/g, '&#39');
    }

    async createSchema() {
        this.loading = await this.loadingController.create({
            message: "Populating data, please wait...",
            spinner: "bubbles",
            translucent: true,
            showBackdrop: false,
            cssClass: 'loading'
        });
        await this.loading.present();

        this.platform.ready().then(() => {

            this.sqlite.create({
                name: 'data.db',
                location: 'default'
            })
            .then((db: SQLiteObject) => {

                this.sql.push('CREATE TABLE IF NOT EXISTS places (' +
                'id integer, ' +
                'title varchar, ' +
                'services varchar, ' +
                'counter_type varchar, ' +
                'address_1 varchar, ' +
                'address_2 varchar, ' +
                'email varchar, ' +
                'phone varchar, ' +
                'location varchar, ' +
                'postcode varchar, ' +
                'suburb varchar, ' +
                'operating_hours varchar)');

                this.sql.push(
                    'CREATE TABLE IF NOT EXISTS opening_hours (' +
                        'id integer, ' +
                        'day varchar, ' +
                        'start_time varchar, ' +
                        'end_time varchar' +
                    ')'
                );

                db.sqlBatch(this.sql).then(() => {
                    db.executeSql(
                        'SELECT count(*) as count from places',
                        []
                    ).then((data) => {
                        if (data.rows.item(0).count > 0) {
                            this.loading.dismiss();
                        } else {
                            this.fetchData(db);
                        }
                    })
                    .catch(e => console.log(e));
                });
            })
            .catch(() => console.log('not able to create database'));
        });
    }

    fetchData(db) {
        this.sql = [];
        this.sql.push('DELETE FROM places; DELETE FROM opening_hours');
        this.http.get(this.url + '?sql=SELECT * from "652252e9-e21a-43fd-b761-3592b365fb28"')
        .subscribe(response => {
            this.populateData(response['result']['records']);

            db.sqlBatch(this.sql).then(() => {
                this.loading.dismiss();
            }).catch(e => console.log(e));
        });
    }

    populateData(records) {
        for (var i = 0; i < records.length; i++) {
            this.insertRecord(records[i], i);
        }
    }

    insertRecord(record, id) {

        id =+ 1;
        this.sql.push('INSERT INTO places('
            + 'id,'
            + 'title,'
            + 'services,'
            + 'counter_type,'
            + 'address_1,'
            + 'address_2,'
            + 'email,'
            + 'phone,'
            + 'location,'
            + 'postcode,'
            + 'suburb,'
            + 'operating_hours' +
        ') VALUES ('
            + id + ','
            + "'" + this.escapeString(record['Title']) + "',"
            + "'" + this.escapeString(record['Services']) + "',"
            + "'" + this.escapeString(record['Counter type']) + "',"
            + "'" + this.escapeString(record['Address 1']) + "',"
            + "'" + this.escapeString(record['Address 2']) + "',"
            + "'" + this.escapeString(record['Email']) + "',"
            + "'" + this.escapeString(record['Phone']) + "',"
            + "'" + this.escapeString(record['Location']) + "',"
            + "'" + this.escapeString(record['Postcode']) + "',"
            + "'" + this.escapeString(record['Suburb']) + "',"
            + "'" + this.escapeString(record['Operating hours']) + "'" +
        ')');

        var days = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'];
        for (var i = 0; i < 7; i++) {
            var dayKey = days[i] + ' am';
            if (record[dayKey] !== '') {
                this.insertTime(id, days[i], record[dayKey]);
            }

            var nightKey = days[i] + ' pm';
            if (record[nightKey] !== '') {
                this.insertTime(id, days[i], record[nightKey]);
            }
        }
    }

    insertTime(nextId, day, time) {
        var parts = time.split('-');
        var startTime = (parts[0].length === 5 ? parts[0] : '0' + parts[0]) + ':00';
        var endTime = (parts[1].length === 5 ? parts[1] : '0' + parts[1]) + ':00';

        this.sql.push(
            'INSERT INTO opening_hours('
                + 'id,'
                + 'day,'
                + 'start_time,'
                + 'end_time' +
            ') VALUES ('
                + nextId + ','
                + "'" + day + "',"
                + "'" + startTime + "',"
                + "'" + endTime + "'" +
            ')');
    }
}
