import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@repo/ui";
import { Actions, Card, Description, EmptyBox, Icon, IconWrap, Plus, Strong, Title } from "./styles";

export default function TaskFlowEmpty() {
  const { t } = useTranslation("tms");
  const navigate = useNavigate();

  return (
    <Card>
      <EmptyBox>
        <IconWrap>
          <Icon aria-hidden>📄</Icon>
        </IconWrap>

        <Title>{t("list.empty.title")}</Title>

        <Description>
          {t("list.empty.descPrefix")}<Strong>{t("list.empty.createButton")}</Strong>{t("list.empty.descSuffix")}
        </Description>

        <Actions>
          <Button theme="primary" type="button" onClick={() => navigate("/taskflows/new")}>
            <Plus aria-hidden>＋</Plus>
            {t("list.empty.createButton")}
          </Button>
        </Actions>
      </EmptyBox>
    </Card>
  );
}
