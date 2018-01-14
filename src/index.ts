import { Processor } from "./processors/processor";
import { TelegramProcessor } from "./processors/telegram.processor";

const telegramBot = new TelegramProcessor();
Processor.register(telegramBot);

Processor.runAll();
