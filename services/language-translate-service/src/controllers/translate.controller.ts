import {
  Request,
  RestBindings,
  post,
  requestBody,
  getModelSchemaRef,
  HttpErrors,
} from '@loopback/rest';
import {inject} from '@loopback/context';
import {JsdomService} from '../services';
import {LanguageTranslateBindings} from '../keys';
import {CONTENT_TYPE, STATUS_CODE} from '@sourceloop/core';
import {TranslateModelDto} from '../models';
import {TextType} from '../types';
export class TranslateController {
  constructor(
    @inject(RestBindings.Http.REQUEST) private readonly req: Request,
    @inject(LanguageTranslateBindings.jsDomService)
    private readonly jsDomService: JsdomService,
  ) {}
  @post('/translations', {
    responses: {
      [STATUS_CODE.OK]: {
        description: 'translate success',
        content: {
          [CONTENT_TYPE.JSON]: {
            schema: getModelSchemaRef(TranslateModelDto)
          },
        },
      },
      [STATUS_CODE.INTERNAL_SERVER_ERROR]: {
        description: 'api/code level error in getting translation',
      },
    },
  })
  async makeTranslation(
    @requestBody({
      content: {
        [CONTENT_TYPE.JSON]: {
          schema: getModelSchemaRef(TranslateModelDto),
        },
      },
    })
    body: TranslateModelDto,
  ): Promise<string> {
    console.log(TranslateModelDto);
    console.log(getModelSchemaRef(TranslateModelDto));
    if (!body) {
      throw  new HttpErrors.BadRequest('Request body with targetLanguage, text and type is required');
    }
    const { targetLanguage = '', text = '', type = ''} = body;
    if (!targetLanguage) {
      throw  new HttpErrors.BadRequest('TargetLanguage is required');
    }
    if (!text) {
      throw  new HttpErrors.BadRequest('Text is required');
    }
    if (!type) {
      throw new HttpErrors.BadRequest('Type is required');
    }
    if (type === TextType.HTML) {
      const translatedText = await this.jsDomService.translateTextUsingjsDom(
        text,
        targetLanguage,
      );
      return translatedText;
    }
    return '';
  }
}
