-- Add last_scraped_at to buy_boxes table for tracking update cycles
ALTER TABLE buy_boxes
ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_buy_boxes_last_scraped_at ON buy_boxes(last_scraped_at NULLS FIRST);

-- Add comment
COMMENT ON COLUMN buy_boxes.last_scraped_at IS 'Last time this buy box was processed by the daily update job';


