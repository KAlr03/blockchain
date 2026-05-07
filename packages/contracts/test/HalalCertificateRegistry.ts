import { expect } from "chai";
import { ethers } from "hardhat";

describe("HalalCertificateRegistry", function () {
  it("records a final authority decision only once", async function () {
    const [, authority] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("HalalCertificateRegistry");
    const registry = await Registry.deploy(authority.address);

    await registry.connect(authority).recordCertificateDecision(
      "cert-1",
      "batch-1",
      "product-1",
      "Lamb Cuts",
      "Kuwait Municipality",
      "hash-1",
      1710000000,
      1810000000,
      true
    );

    const certificate = await registry.getCertificateByProductId("product-1");
    expect(certificate[0]).to.equal("cert-1");
    expect(certificate[8]).to.equal("Approved");
  });

  it("anchors traceability records by trace id", async function () {
    const [, authority] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("HalalCertificateRegistry");
    const registry = await Registry.deploy(authority.address);

    await registry.connect(authority).recordTraceability(
      "trace-1",
      "product-1",
      "batch-1",
      "Warehouse Intake",
      "Kuwait Municipality Inspector",
      "trace-hash-1",
      1710000100
    );

    const traceability = await registry.getTraceabilityById("trace-1");
    expect(traceability[0]).to.equal("trace-1");
    expect(traceability[1]).to.equal("product-1");
    expect(traceability[5]).to.equal("trace-hash-1");

    const traceabilityIds = await registry.getTraceabilityIdsByProductId("product-1");
    expect(traceabilityIds).to.deep.equal(["trace-1"]);
  });
});
