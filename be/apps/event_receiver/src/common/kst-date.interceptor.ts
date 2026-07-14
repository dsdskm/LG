import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { convertDatesDeep } from "@ai-log/shared-contracts";

/**
 * 모든 HTTP 응답을 순회하며 Date 값을 KST(+09:00) 문자열로 일괄 변환한다.
 * timestamptz 컬럼은 UTC로 저장되지만, 응답 시점에 한국 시간으로 직렬화된다.
 */
@Injectable()
export class KstDateInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => convertDatesDeep(data)));
  }
}
