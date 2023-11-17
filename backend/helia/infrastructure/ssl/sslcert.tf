provider "acme" {
  server_url = var.server_url
}

resource "tls_private_key" "private_key" {
  algorithm = "RSA"
}

resource "acme_registration" "registration" {
  account_key_pem = tls_private_key.private_key.private_key_pem
  email_address = var.email
}

resource "acme_certificate" "certificate" {
  account_key_pem = acme_registration.registration.account_key_pem
  common_name = var.common_name
  subject_alternative_names = var.dns_alt_names
  
  dns_challenge {
    provider = "route53"
  }
}