import { download } from './download';
import GirafeSingleton from '../../base/GirafeSingleton';
import ConfigManager from '../configuration/configmanager';
import I18nManager from '../i18n/i18nmanager';
import GirafeConfig from '../configuration/girafeconfig';

/**
 * Definition for grid columns.
 */
type GridColumnDef = {
  /**
   * Name of a column.
   */
  name: string;
};

export default class CsvManager extends GirafeSingleton {
  private configManager: ConfigManager;
  private i18nManager: I18nManager;

  constructor(type: string) {
    super(type);
    this.i18nManager = I18nManager.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  get config(): GirafeConfig {
    return this.configManager.Config;
  }

  /**
   * Generate a CSV.
   * @param data Entries/objects to include in the CSV.
   * @param columnDefs Column definitions.
   * @returns The CSV file as string.
   */
  generateCsv(data: { [x: string]: unknown }[], columnDefs: GridColumnDef[]): string {
    if (data.length == 0 || columnDefs.length == 0) {
      return '';
    }

    const translatedColumnHeaders: unknown[] = columnDefs.map((columnHeader: GridColumnDef) =>
      this.i18nManager.getTranslation(columnHeader.name)
    );

    const header = this.getRow(translatedColumnHeaders);
    const dataRows = data.map((values) => {
      const rowValues: unknown[] = columnDefs.map((columnHeader: GridColumnDef) => values[columnHeader.name]);
      return this.getRow(rowValues);
    });

    return this.config.csv.includeHeader ? header + dataRows.join('') : dataRows.join('');
  }

  /**
   * @param values Values.
   * @returns CSV row.
   */
  private getRow(values: unknown[]): string {
    const matchAllQuotesRegex = new RegExp(this.config.csv.quote, 'g');
    const doubleQuote = this.config.csv.quote + this.config.csv.quote;

    const rowValues = values.map((value) => {
      if (value !== undefined && value !== null) {
        const strValue = `${value}`;
        // wrap each value into quotes and escape quotes with double quotes
        return `${this.config.csv.quote}${strValue.replace(matchAllQuotesRegex, doubleQuote)}${this.config.csv.quote}`;
      } else {
        return '';
      }
    });

    return `${rowValues.join(this.config.csv.separator)}\n`;
  }

  /**
   * Generate a CSV and start a download with the generated file.
   * @param data Entries/objects to include in the CSV.
   * @param columnDefs Column definitions.
   * @param fileName The CSV file name, without the extension.
   */
  startDownload(data: { [x: string]: unknown }[], columnDefs: GridColumnDef[], fileName: string): void {
    const fileContent = this.generateCsv(data, columnDefs);
    download(fileContent, fileName, `text/csv;charset=${this.config.csv.encoding}`);
  }
}
