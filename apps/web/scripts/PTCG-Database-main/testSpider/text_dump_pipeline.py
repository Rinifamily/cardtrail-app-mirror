import json
from datetime import datetime


class TextDumpPipeline:
    """Simple pipeline that dumps every scraped card into a txt file."""

    def open_spider(self, spider):
        dump_file = getattr(spider, 'dump_file', None)
        if not dump_file:
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            dump_file = f'scrape_dump_{timestamp}.txt'
        self.file_path = dump_file
        self.file = open(self.file_path, 'w', encoding='utf-8')
        self.file.write(f"# Dump generated {datetime.utcnow().isoformat()}Z\n")

    def process_item(self, item, spider):
        line = json.dumps(dict(item), ensure_ascii=False)
        self.file.write(line + '\n')
        return item

    def close_spider(self, spider):
        if hasattr(self, 'file') and not self.file.closed:
            self.file.close()

