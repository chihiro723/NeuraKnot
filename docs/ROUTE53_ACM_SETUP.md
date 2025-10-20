# Route 53 & ACM セットアップガイド

このドキュメントでは、カスタムドメインの設定と SSL/TLS 証明書の取得方法について説明します。

---

## 📋 目次

1. [概要](#概要)
2. [Route 53 の設定](#route-53-の設定)
3. [ACM 証明書の取得](#acm-証明書の取得)
4. [ALB への証明書適用](#alb-への証明書適用)
5. [トラブルシューティング](#トラブルシューティング)

---

## 概要

### 使用するサービス

- **Route 53**: AWS の DNS サービス
- **ACM (AWS Certificate Manager)**: SSL/TLS 証明書の管理サービス
- **ALB (Application Load Balancer)**: HTTPS 通信を提供

### アーキテクチャ

```
ブラウザ
  ↓ HTTPS (api.neuraknot.net)
Route 53 (DNS)
  ↓
ALB (SSL/TLS 終端)
  ↓ HTTP
ECS (Backend Go/Python)
```

---

## Route 53 の設定

### 1. ドメインの購入

AWS Route 53 または他のレジストラ（お名前.com など）でドメインを購入します。

**例**: `neuraknot.net`

### 2. Hosted Zone の作成

Terraform で自動的に作成されます：

```hcl
# terraform/modules/route53/main.tf
resource "aws_route53_zone" "main" {
  name    = var.domain_name
  comment = "Managed by Terraform"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-zone"
  })
}
```

### 3. ネームサーバーの設定

#### ステップ 1: ネームサーバーを確認

```bash
cd terraform/environments/prod
terraform output -json | jq -r '.route53_name_servers.value[]'
```

または

```bash
aws route53 get-hosted-zone --id <ZONE_ID> --query 'DelegationSet.NameServers' --output table
```

#### ステップ 2: ドメインレジストラで設定

Route 53 コンソール → **Registered domains** → ドメインを選択 → **Add or edit name servers**

以下のようなネームサーバーを設定：

```
ns-340.awsdns-42.com
ns-723.awsdns-26.net
ns-1910.awsdns-46.co.uk
ns-1400.awsdns-47.org
```

#### ステップ 3: DNS 伝播を確認

```bash
dig api.neuraknot.net +short
# または
dig @8.8.8.8 api.neuraknot.net +short
```

**伝播時間**: 通常 5-10 分、最大 48 時間

### 4. DNS レコードの作成

API サーバー用の A レコード（Alias）を作成：

```hcl
# terraform/modules/route53/main.tf
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
```

これにより、`api.neuraknot.net` → ALB へのマッピングが作成されます。

---

## ACM 証明書の取得

### 1. 証明書のリクエスト

Terraform で自動的にリクエストされます：

```hcl
# terraform/modules/acm/main.tf
resource "aws_acm_certificate" "main" {
  domain_name       = var.domain_name
  validation_method = "DNS"
  subject_alternative_names = var.subject_alternative_names

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-certificate"
  })
}
```

### 2. DNS 検証レコードの作成

Terraform が自動的に Route 53 に検証用の CNAME レコードを作成：

```hcl
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}
```

### 3. 証明書の検証待機

```hcl
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
```

**検証時間**: 通常 5-30 分

### 4. 証明書の状態確認

```bash
aws acm describe-certificate \
  --certificate-arn <CERTIFICATE_ARN> \
  --query 'Certificate.{Status:Status,DomainName:DomainName,NotBefore:NotBefore,NotAfter:NotAfter}' \
  --output table
```

**期待される出力**:

```
---------------------------------------------
|            DescribeCertificate            |
+-------------+-----------------------------+
|  DomainName |  neuraknot.net              |
|  NotAfter   |  2026-11-18T08:59:59+09:00  |
|  NotBefore  |  2025-10-19T09:00:00+09:00  |
|  Status     |  ISSUED                     |
+-------------+-----------------------------+
```

### 5. ワイルドカード証明書

サブドメインにも対応するため、ワイルドカード証明書を使用：

```hcl
subject_alternative_names = ["*.${var.domain_name}"]
```

これにより、以下のドメインすべてで有効：

- `neuraknot.net`
- `api.neuraknot.net`
- `app.neuraknot.net`
- `*.neuraknot.net`

---

## ALB への証明書適用

### 1. HTTPS リスナーの作成

```hcl
# terraform/modules/alb/main.tf
resource "aws_lb_listener" "https" {
  count = var.ssl_certificate_arn != "" ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.ssl_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_go.arn
  }
}
```

### 2. HTTP から HTTPS へのリダイレクト

```hcl
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = var.ssl_certificate_arn != "" ? "redirect" : "forward"
    target_group_arn = var.ssl_certificate_arn == "" ? aws_lb_target_group.backend_go.arn : null

    dynamic "redirect" {
      for_each = var.ssl_certificate_arn != "" ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }
}
```

### 3. セキュリティグループの更新

HTTPS トラフィックを許可：

```hcl
resource "aws_security_group_rule" "alb_https_ingress" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  ipv6_cidr_blocks  = ["::/0"]
  security_group_id = aws_security_group.alb.id
  description       = "Allow HTTPS inbound traffic"
}
```

---

## デプロイ手順

### 1. 変数の設定

`terraform/environments/prod/terraform.tfvars`:

```hcl
# Domain Configuration
domain_name = "neuraknot.net"

# Frontend URL for CORS
frontend_url = "https://neuraknot.vercel.app"

# Allowed Origins
allowed_origins = [
  "https://neuraknot.net",
  "https://www.neuraknot.net",
  "https://neuraknot.vercel.app"
]
```

### 2. Terraform Apply（2 段階）

#### ステップ 1: Route 53 と ACM を先に作成

```bash
cd terraform/environments/prod
terraform apply \
  -var-file=terraform.tfvars \
  -var-file=secrets.tfvars \
  -target=module.route53 \
  -target=module.acm \
  -auto-approve
```

**待機**: ACM 証明書が `ISSUED` 状態になるまで待つ（5-30 分）

#### ステップ 2: 残りのリソースを作成

```bash
terraform apply \
  -var-file=terraform.tfvars \
  -var-file=secrets.tfvars \
  -auto-approve
```

### 3. 動作確認

```bash
# DNS 解決確認
dig api.neuraknot.net +short

# HTTPS アクセス確認
curl -s https://api.neuraknot.net/api/health
# 期待される出力: {"status":"ok"}

# 証明書確認
curl -vI https://api.neuraknot.net 2>&1 | grep -A 5 "Server certificate"
```

---

## トラブルシューティング

### 問題 1: DNS が解決されない

**症状**:

```bash
dig api.neuraknot.net +short
# 何も表示されない
```

**原因**: ネームサーバーが正しく設定されていない

**解決策**:

1. Route 53 のネームサーバーを確認
2. ドメインレジストラで正しく設定されているか確認
3. DNS 伝播を待つ（最大 48 時間）

**確認コマンド**:

```bash
# 現在のネームサーバーを確認
dig neuraknot.net NS +short

# Google DNS で確認
dig @8.8.8.8 api.neuraknot.net +short
```

---

### 問題 2: ACM 証明書が PENDING_VALIDATION のまま

**症状**:

```
Status: PENDING_VALIDATION
```

**原因**: DNS 検証レコードが作成されていない、または伝播していない

**解決策**:

1. Route 53 で CNAME レコードを確認

   ```bash
   aws route53 list-resource-record-sets \
     --hosted-zone-id <ZONE_ID> \
     --query "ResourceRecordSets[?Type=='CNAME']" \
     --output table
   ```

2. DNS 検証レコードを手動で確認

   ```bash
   dig _<validation_hash>.neuraknot.net CNAME +short
   ```

3. 時間を置いて再確認（最大 30 分）

---

### 問題 3: HTTPS アクセスで証明書エラー

**症状**:

```
SSL: no alternative certificate subject name matches target host name
```

**原因**: ALB の DNS 名で直接アクセスしている

**解決策**:
カスタムドメイン（`api.neuraknot.net`）でアクセスしてください。

---

### 問題 4: ブラウザで ERR_NAME_NOT_RESOLVED

**症状**:

```
net::ERR_NAME_NOT_RESOLVED
```

**原因**: ブラウザの DNS キャッシュ

**解決策**:

#### Chrome/Edge

1. `chrome://net-internals/#dns` にアクセス
2. "Clear host cache" をクリック
3. `chrome://net-internals/#sockets` にアクセス
4. "Flush socket pools" をクリック

#### Firefox

1. `about:networking#dns` にアクセス
2. "Clear DNS Cache" をクリック

#### Safari

- Safari を完全に終了して再起動

---

### 問題 5: Terraform Apply がタイムアウト

**症状**:

```
Error: waiting for ACM Certificate to be issued: timeout
```

**原因**: ACM 証明書の検証に時間がかかっている

**解決策**:

1. 証明書の状態を確認

   ```bash
   aws acm describe-certificate --certificate-arn <ARN>
   ```

2. `ISSUED` になったら再度 apply
   ```bash
   terraform apply -var-file=terraform.tfvars -var-file=secrets.tfvars
   ```

---

## ベストプラクティス

### 1. 証明書の自動更新

ACM 証明書は**自動的に更新**されます（有効期限の 60 日前）。

### 2. ワイルドカード証明書の使用

将来的にサブドメインを追加する可能性がある場合、ワイルドカード証明書を使用：

```hcl
subject_alternative_names = ["*.${var.domain_name}"]
```

### 3. SSL ポリシーの選択

セキュリティと互換性のバランスを考慮：

```hcl
ssl_policy = "ELBSecurityPolicy-TLS-1-2-2017-01"  # 推奨
```

より厳格なポリシー：

```hcl
ssl_policy = "ELBSecurityPolicy-TLS13-1-2-2021-06"  # TLS 1.3 のみ
```

### 4. HSTS の有効化

HTTPS を強制するため、ALB のレスポンスヘッダーに追加を検討：

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 参考リンク

- [AWS Route 53 ドキュメント](https://docs.aws.amazon.com/route53/)
- [AWS Certificate Manager ドキュメント](https://docs.aws.amazon.com/acm/)
- [ALB HTTPS リスナー](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html)
- [DNS 伝播チェックツール](https://www.whatsmydns.net/)

---

## まとめ

このガイドに従うことで、以下が実現できます：

✅ カスタムドメインの設定（Route 53）  
✅ SSL/TLS 証明書の取得（ACM）  
✅ HTTPS 通信の有効化（ALB）  
✅ HTTP から HTTPS への自動リダイレクト  
✅ ワイルドカード証明書によるサブドメイン対応

これにより、本番環境で安全な HTTPS 通信が可能になります。
